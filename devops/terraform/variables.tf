variable "aws_region" {
  description = "Région AWS. eu-west-3 (Paris) = meilleur compromis latence/services pour l'Afrique centrale (af-south-1 Le Cap est plus loin réseau de Libreville dans la pratique — mesurer !)."
  type        = string
  default     = "eu-west-3"
}

variable "environment" {
  description = "Environnement cible (staging | production). Un workspace/state par environnement."
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment doit être staging ou production."
  }
}

variable "vpc_cidr" {
  description = "Plage IP privée du VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "eks_version" {
  description = "Version Kubernetes du cluster EKS."
  type        = string
  default     = "1.29"
}

variable "api_min_nodes" {
  description = "Taille min du node group (2 = tolérance de panne d'une AZ)."
  type        = number
  default     = 2
}

variable "api_max_nodes" {
  description = "Taille max du node group (plafond de coût)."
  type        = number
  default     = 4
}

variable "db_instance_class" {
  description = "Classe RDS. db.t4g.micro suffit largement au lancement (Graviton = -20 % de coût)."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  type    = string
  default = "mbolo_sante"
}

variable "db_username" {
  type    = string
  default = "mbolo"
}
# ⚠️ PAS de variable db_password : le mot de passe est GÉNÉRÉ par RDS et stocké
# dans Secrets Manager (manage_master_user_password) — jamais dans le code ni
# le state en clair.
