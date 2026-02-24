# ---------------------------------------------------------------------------
# API Gateway - shared HTTP API, JWT authorizer, stage
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

data "aws_region" "current" {}

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

resource "aws_apigatewayv2_stage" "jobs" {
  api_id      = aws_apigatewayv2_api.jobs.id
  name        = "$default"
  auto_deploy = true
}
