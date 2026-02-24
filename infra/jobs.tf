# ---------------------------------------------------------------------------
# Jobs service - DynamoDB, Jobs Lambda, /jobs/* routes
# ---------------------------------------------------------------------------

# DynamoDB (docs/03-service-catalog, 06-data-and-persistence)
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

# Jobs Lambda
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

# Run yarn build:lambda from app/services/jobs before first apply
data "archive_file" "jobs" {
  type        = "zip"
  source_dir  = "${path.module}/../app/services/jobs/build/package"
  output_path = "${path.module}/../app/services/jobs/build/package.zip"
}

resource "aws_lambda_function" "jobs" {
  function_name    = "gig-platform-jobs"
  role             = aws_iam_role.jobs_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  filename         = data.archive_file.jobs.output_path
  source_code_hash = data.archive_file.jobs.output_base64sha256

  environment {
    variables = {
      TABLE_NAME     = aws_dynamodb_table.jobs.name
      EVENT_BUS_NAME = "default"
      ENVIRONMENT    = var.environment
    }
  }
}

# API Gateway - jobs integration and routes
resource "aws_apigatewayv2_integration" "jobs" {
  api_id                 = aws_apigatewayv2_api.jobs.id
  integration_type       = "AWS_PROXY"
  integration_uri         = aws_lambda_function.jobs.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
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

resource "aws_lambda_permission" "jobs_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.jobs.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.jobs.execution_arn}/*/*"
}
