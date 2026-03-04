# ---------------------------------------------------------------------------
# Identity service - Cognito, auth Lambda, /auth/* routes
# ---------------------------------------------------------------------------

# Cognito (docs 07, ADR-003)
resource "aws_cognito_user_pool" "main" {
  name = "${var.name_prefix}-users-${var.environment}"

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
  name         = "${var.name_prefix}-app-${var.environment}"
  user_pool_id = aws_cognito_user_pool.main.id

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH"
  ]
  generate_secret = false
  read_attributes  = ["email"]
  write_attributes = ["email"]
}

# Identity Lambda
resource "aws_iam_role" "identity_lambda" {
  name = "${var.name_prefix}-identity-lambda-role-${var.environment}"

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
          "cognito-idp:InitiateAuth",
          "cognito-idp:ListUsers"
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
  function_name    = "${var.name_prefix}-identity-${var.environment}"
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
      ENVIRONMENT  = var.environment
    }
  }
}

# API Gateway - identity integration and auth routes
resource "aws_apigatewayv2_integration" "identity" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri         = aws_lambda_function.identity.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "auth_register" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /auth/register"
  target    = "integrations/${aws_apigatewayv2_integration.identity.id}"
}

resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.identity.id}"
}

resource "aws_apigatewayv2_route" "auth_refresh" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /auth/refresh"
  target    = "integrations/${aws_apigatewayv2_integration.identity.id}"
}

resource "aws_apigatewayv2_route" "auth_me" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "GET /auth/me"
  target             = "integrations/${aws_apigatewayv2_integration.identity.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "users_get" {
  api_id             = aws_apigatewayv2_api.api.id
  route_key          = "GET /users/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.identity.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "identity_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.identity.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
