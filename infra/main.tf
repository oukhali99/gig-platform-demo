terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ---------------------------------------------------------------------------
# DynamoDB - Jobs table (docs/03-service-catalog, 06-data-and-persistence)
# ---------------------------------------------------------------------------
resource "aws_dynamodb_table" "jobs" {
  name         = "gig-platform-jobs"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "jobId"

  attribute {
    name = "jobId"
    type = "S"
  }
  attribute {
    name = "status"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "S"
  }
  attribute {
    name = "clientId"
    type = "S"
  }

  global_secondary_index {
    name            = "status-createdAt-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "clientId-createdAt-index"
    hash_key        = "clientId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
}

# ---------------------------------------------------------------------------
# Cognito - User pool and app client (docs 07, ADR-003)
# ---------------------------------------------------------------------------
resource "aws_cognito_user_pool" "main" {
  name = "gig-platform-users"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  schema {
    name                = "email"
    attribute_data_type = "String"
    required            = true
    mutable             = true
  }
  schema {
    name                = "custom:role"
    attribute_data_type = "String"
    required            = false
    mutable             = true
    string_attribute_constraints {
      min_length = 1
      max_length = 32
    }
  }

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }
}

resource "aws_cognito_user_pool_client" "main" {
  name         = "gig-platform-app"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
  generate_secret = false
  read_attributes  = ["email"]
  write_attributes = ["email"]
}

# Groups used for role (client vs worker); JWT includes cognito:groups (no schema change)
resource "aws_cognito_user_group" "client" {
  name         = "client"
  user_pool_id = aws_cognito_user_pool.main.id
}
resource "aws_cognito_user_group" "worker" {
  name         = "worker"
  user_pool_id = aws_cognito_user_pool.main.id
}

# ---------------------------------------------------------------------------
# Lambda - Jobs API handler
# ---------------------------------------------------------------------------
resource "aws_iam_role" "jobs_lambda" {
  name = "gig-platform-jobs-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "jobs_lambda_dynamodb" {
  name = "dynamodb"
  role = aws_iam_role.jobs_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:ConditionCheckItem"
        ]
        Resource = [
          aws_dynamodb_table.jobs.arn,
          "${aws_dynamodb_table.jobs.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "jobs_lambda_events" {
  name = "events"
  role = aws_iam_role.jobs_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "events:PutEvents"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "jobs_lambda_logs" {
  role       = aws_iam_role.jobs_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda deployment package (run yarn build:lambda from app/services/jobs before first apply)
data "archive_file" "jobs" {
  type        = "zip"
  source_dir  = "${path.module}/../app/services/jobs/build/package"
  output_path = "${path.module}/../app/services/jobs/build/package.zip"
}

resource "aws_lambda_function" "jobs" {
  function_name = "gig-platform-jobs"
  role          = aws_iam_role.jobs_lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  filename      = data.archive_file.jobs.output_path
  source_code_hash = data.archive_file.jobs.output_base64sha256

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.jobs.name
      EVENT_BUS_NAME = "default"
    }
  }
}

# ---------------------------------------------------------------------------
# Lambda - Identity (auth) handler
# ---------------------------------------------------------------------------
resource "aws_iam_role" "identity_lambda" {
  name = "gig-platform-identity-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy" "identity_lambda_cognito" {
  name = "cognito"
  role = aws_iam_role.identity_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cognito-idp:SignUp",
          "cognito-idp:AdminConfirmSignUp",
          "cognito-idp:AdminAddUserToGroup",
          "cognito-idp:InitiateAuth"
        ]
        Resource = [aws_cognito_user_pool.main.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "identity_lambda_logs" {
  role       = aws_iam_role.identity_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "identity" {
  type        = "zip"
  source_dir  = "${path.module}/../app/services/identity/build/package"
  output_path = "${path.module}/../app/services/identity/build/package.zip"
}

resource "aws_lambda_function" "identity" {
  function_name    = "gig-platform-identity"
  role             = aws_iam_role.identity_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  filename         = data.archive_file.identity.output_path
  source_code_hash = data.archive_file.identity.output_base64sha256

  environment {
    variables = {
      USER_POOL_ID = aws_cognito_user_pool.main.id
      CLIENT_ID    = aws_cognito_user_pool_client.main.id
    }
  }
}

# ---------------------------------------------------------------------------
# API Gateway HTTP API (jobs + auth)
# ---------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "jobs" {
  name          = "gig-platform-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization", "X-Correlation-Id"]
  }
}

# Cognito JWT authorizer (required for /auth/me and /jobs/*)
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.jobs.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "cognito-authorizer"

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.main.id]
    issuer   = "https://cognito-idp.${data.aws_region.current.name}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

data "aws_region" "current" {}

resource "aws_apigatewayv2_integration" "jobs" {
  api_id                 = aws_apigatewayv2_api.jobs.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.jobs.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "identity" {
  api_id                 = aws_apigatewayv2_api.jobs.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.identity.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Auth routes (no authorizer for register/login/refresh)
resource "aws_apigatewayv2_route" "auth_register" {
  api_id    = aws_apigatewayv2_api.jobs.id
  route_key = "POST /auth/register"
  target    = "integrations/${aws_apigatewayv2_integration.identity.id}"
}

resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.jobs.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.identity.id}"
}

resource "aws_apigatewayv2_route" "auth_refresh" {
  api_id    = aws_apigatewayv2_api.jobs.id
  route_key = "POST /auth/refresh"
  target    = "integrations/${aws_apigatewayv2_integration.identity.id}"
}

resource "aws_apigatewayv2_route" "auth_me" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "GET /auth/me"
  target             = "integrations/${aws_apigatewayv2_integration.identity.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "jobs_list" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "GET /jobs"
  target             = "integrations/${aws_apigatewayv2_integration.jobs.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "jobs_create" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "POST /jobs"
  target             = "integrations/${aws_apigatewayv2_integration.jobs.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "jobs_get" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "GET /jobs/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.jobs.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "jobs_update" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "PUT /jobs/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.jobs.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "jobs_publish" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "POST /jobs/{id}/publish"
  target             = "integrations/${aws_apigatewayv2_integration.jobs.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "jobs_delete" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "DELETE /jobs/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.jobs.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_stage" "jobs" {
  api_id      = aws_apigatewayv2_api.jobs.id
  name       = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "jobs_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.jobs.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.jobs.execution_arn}/*/*"
}

resource "aws_lambda_permission" "identity_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.identity.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.jobs.execution_arn}/*/*"
}
