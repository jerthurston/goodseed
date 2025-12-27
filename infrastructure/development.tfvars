# Development Environment Configuration
# Run with: terraform apply -var-file="development.tfvars"

environment = "development"
project_name = "goodseed"

# Domain configuration (set to true when you have a custom domain)
enable_custom_domain = false
domain_name = ""  # Set to your domain like "goodseed.com"

# Resource sizing for development (minimal costs)
web_task_cpu = 256
web_task_memory = 512
web_desired_count = 1

worker_task_cpu = 256  
worker_task_memory = 512
worker_desired_count = 1

# Database configuration for development
db_instance_class = "db.t3.micro"
db_allocated_storage = 20
db_max_allocated_storage = 100

# Monitoring (disabled for cost savings)
enable_advanced_monitoring = false