variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment: prod (default) or dev. Dev enables verbose Lambda logging."
  type        = string
  default     = "prod"
  validation {
    condition     = contains(["prod", "dev"], var.environment)
    error_message = "environment must be \"prod\" or \"dev\"."
  }
}
