# ─────────────────────────────────────────────────────────────────────────────
# REGISTRY D'IMAGES (ECR) — là où la CI pousse l'image Docker de l'API,
# et où EKS vient la tirer. Scan de vulnérabilités activé à chaque push.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_ecr_repository" "api" {
  name                 = "mbolo/api"
  image_tag_mutability = "IMMUTABLE"   # un tag = une image, à jamais (traçabilité des déploiements)

  image_scanning_configuration {
    scan_on_push = true
  }
}

# On ne garde que les 20 dernières images : le registry n'est pas une poubelle.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Garder les 20 dernières images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 20
      }
      action = { type = "expire" }
    }]
  })
}
