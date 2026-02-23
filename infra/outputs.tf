output "api_url" {
  description = "API base URL (jobs + auth)"
  value       = aws_apigatewayv2_stage.jobs.invoke_url
}

output "jobs_table_name" {
  description = "Jobs DynamoDB table name"
  value       = aws_dynamodb_table.jobs.name
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "Cognito app client ID"
  value       = aws_cognito_user_pool_client.main.id
}
