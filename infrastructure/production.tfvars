# Production Environment Configuration  
# Run with: terraform apply -var-file="production.tfvars"

environment = "production"
project_name = "goodseed"

# Domain configuration (enable when you have a custom domain)
enable_custom_domain = false  # Will setup later with proper domain
domain_name = ""  # Will choose production domain later

# Resource sizing for production
web_task_cpu = 512
web_task_memory = 1024
web_desired_count = 2  # For high availability

worker_task_cpu = 512
worker_task_memory = 1024
worker_desired_count = 1

# Database configuration for production
db_instance_class = "db.t3.small"
db_allocated_storage = 100
db_max_allocated_storage = 500

# Monitoring enabled for production
enable_advanced_monitoring = true