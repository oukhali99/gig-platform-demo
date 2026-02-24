# ---------------------------------------------------------------------------
# Bookings service - DynamoDB, Bookings Lambda, /bookings/* routes
# ---------------------------------------------------------------------------

resource "aws_dynamodb_table" "bookings" {
  name         = "${var.name_prefix}-bookings-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "bookingId"

  attribute {
    name = "bookingId"
    type = "S"
  }
  attribute {
    name = "jobId"
    type = "S"
  }
  attribute {
    name = "workerId"
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
    name = "idempotencyKey"
    type = "S"
  }

  global_secondary_index {
    name            = "jobId-createdAt-index"
    hash_key        = "jobId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "workerId-createdAt-index"
    hash_key        = "workerId"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "status-createdAt-index"
    hash_key        = "status"
    range_key       = "createdAt"
    projection_type = "ALL"
  }
  global_secondary_index {
    name            = "idempotencyKey-index"
    hash_key        = "idempotencyKey"
    projection_type = "ALL"
  }
}

resource "aws_iam_role" "bookings_lambda" {
  name = "${var.name_prefix}-bookings-lambda-role-${var.environment}"

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

resource "aws_iam_role_policy" "bookings_lambda_dynamodb" {
  name = "dynamodb"
  role = aws_iam_role.bookings_lambda.id

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
          aws_dynamodb_table.bookings.arn,
          "${aws_dynamodb_table.bookings.arn}/index/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = "dynamodb:GetItem"
        Resource = [aws_dynamodb_table.jobs.arn]
      }
    ]
  })
}

resource "aws_iam_role_policy" "bookings_lambda_events" {
  name = "events"
  role = aws_iam_role.bookings_lambda.id

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

resource "aws_iam_role_policy_attachment" "bookings_lambda_logs" {
  role       = aws_iam_role.bookings_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "bookings" {
  type        = "zip"
  source_dir  = "${path.module}/../app/services/bookings/build/package"
  output_path = "${path.module}/../app/services/bookings/build/package.zip"
}

resource "aws_lambda_function" "bookings" {
  function_name    = "${var.name_prefix}-bookings-${var.environment}"
  role             = aws_iam_role.bookings_lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 30
  filename         = data.archive_file.bookings.output_path
  source_code_hash = data.archive_file.bookings.output_base64sha256

  environment {
    variables = {
      TABLE_NAME       = aws_dynamodb_table.bookings.name
      JOBS_TABLE_NAME  = aws_dynamodb_table.jobs.name
      EVENT_BUS_NAME   = "default"
      ENVIRONMENT      = var.environment
    }
  }
}

resource "aws_apigatewayv2_integration" "bookings" {
  api_id                 = aws_apigatewayv2_api.jobs.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.bookings.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "bookings_create" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "POST /bookings"
  target             = "integrations/${aws_apigatewayv2_integration.bookings.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "bookings_list" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "GET /bookings"
  target             = "integrations/${aws_apigatewayv2_integration.bookings.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "bookings_get" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "GET /bookings/{id}"
  target             = "integrations/${aws_apigatewayv2_integration.bookings.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "bookings_confirm" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "POST /bookings/{id}/confirm"
  target             = "integrations/${aws_apigatewayv2_integration.bookings.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "bookings_complete" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "POST /bookings/{id}/complete"
  target             = "integrations/${aws_apigatewayv2_integration.bookings.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "bookings_cancel" {
  api_id             = aws_apigatewayv2_api.jobs.id
  route_key          = "POST /bookings/{id}/cancel"
  target             = "integrations/${aws_apigatewayv2_integration.bookings.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_lambda_permission" "bookings_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.bookings.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.jobs.execution_arn}/*/*"
}
