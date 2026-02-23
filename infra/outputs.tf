output "jobs_api_url" {
  description = "Jobs API base URL"
  value       = aws_apigatewayv2_stage.jobs.invoke_url
}

output "jobs_table_name" {
  description = "Jobs DynamoDB table name"
  value       = aws_dynamodb_table.jobs.name
}
