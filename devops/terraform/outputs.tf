# Sorties utilisées par la CI, ArgoCD et les humains.

output "cluster_name" {
  value       = module.eks.cluster_name
  description = "aws eks update-kubeconfig --name <cluster_name> --region <region>"
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "Cible du docker push de la CI."
}

output "rds_endpoint" {
  value       = aws_db_instance.main.address
  description = "Hôte PostgreSQL (le mot de passe est dans Secrets Manager)."
}

output "rds_master_secret_arn" {
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
  description = "ARN du secret Secrets Manager contenant le mot de passe DB."
}

output "redis_endpoint" {
  value = aws_elasticache_replication_group.main.primary_endpoint_address
}
