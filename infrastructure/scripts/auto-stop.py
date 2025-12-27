import json
import boto3
import os
from datetime import datetime

def handler(event, context):
    """
    Auto-stop AWS services when billing threshold is exceeded
    """
    
    # Initialize AWS clients
    ecs = boto3.client('ecs')
    rds = boto3.client('rds')
    elasticache = boto3.client('elasticache')
    
    # Get environment variables
    ecs_cluster = os.environ['ECS_CLUSTER']
    rds_instance = os.environ['RDS_INSTANCE']
    
    try:
        print(f"🚨 Emergency stop triggered at {datetime.now()}")
        
        # Parse SNS message
        message = json.loads(event['Records'][0]['Sns']['Message'])
        alarm_name = message['AlarmName']
        
        print(f"Alarm: {alarm_name}")
        print(f"Stopping services for cost control...")
        
        # Stop ECS services
        try:
            # Get all services in cluster
            services_response = ecs.list_services(cluster=ecs_cluster)
            
            for service_arn in services_response['serviceArns']:
                service_name = service_arn.split('/')[-1]
                
                print(f"Stopping ECS service: {service_name}")
                ecs.update_service(
                    cluster=ecs_cluster,
                    service=service_name,
                    desiredCount=0
                )
                
        except Exception as e:
            print(f"Error stopping ECS services: {str(e)}")
        
        # Stop RDS instance
        try:
            print(f"Stopping RDS instance: {rds_instance}")
            rds.stop_db_instance(
                DBInstanceIdentifier=rds_instance
            )
        except Exception as e:
            print(f"Error stopping RDS: {str(e)}")
            # RDS might already be stopped or not exist
        
        # Note: ElastiCache doesn't support stop/start, only delete
        # We'll just log this for manual intervention
        print("⚠️ ElastiCache cannot be auto-stopped. Manual intervention required.")
        
        # Prepare response message
        response_message = {
            'status': 'success',
            'message': f'Emergency stop completed for {ecs_cluster}',
            'timestamp': datetime.now().isoformat(),
            'services_stopped': ['ECS', 'RDS'],
            'manual_action_required': ['ElastiCache']
        }
        
        print("✅ Emergency stop completed successfully")
        
        return {
            'statusCode': 200,
            'body': json.dumps(response_message)
        }
        
    except Exception as e:
        error_message = f"❌ Emergency stop failed: {str(e)}"
        print(error_message)
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'message': error_message,
                'timestamp': datetime.now().isoformat()
            })
        }