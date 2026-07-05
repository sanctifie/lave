# DevOps MBOLO Santé — projet d'apprentissage complet

> **Objectif : devenir opérationnel en DevOps en construisant, de A à Z, la
> chaîne complète d'une vraie application** (cette app santé) : de
> l'infrastructure (Terraform/AWS) au déploiement continu (GitLab CI + ArgoCD)
> jusqu'à la supervision (Prometheus/Grafana).
>
> 📖 **La bible complète (le POURQUOI de chaque choix, pas-à-pas, pièges) est
> dans [`bible/`](bible/) — également fournie en PDF.**

## La chaîne, en une image

```
   développeur                      GitLab CI                        AWS
┌──────────────┐   push   ┌──────────────────────────┐   ┌─────────────────────────┐
│  git commit  ├─────────►│ lint → test → build image │   │  EKS (Kubernetes)       │
└──────────────┘          │ → scan (trivy) → push ECR │   │  ┌───────────────────┐  │
                          │ → MAJ tag repo GitOps ────┼──►│  │ ArgoCD (tire Git) │  │
                          └──────────────────────────┘   │  └───────┬───────────┘  │
                                                          │          ▼              │
        Terraform ──(crée)──► VPC · EKS · RDS · Redis ·   │   pods API (2..6, HPA) │
        Ansible  ──(configure)─► GitLab Runner EC2        │          │ /metrics     │
                                                          │          ▼              │
                                                          │  Prometheus → Grafana   │
                                                          │        └→ Alertmanager  │
                                                          └─────────────────────────┘
```

## Contenu du dossier

| Dossier | Rôle | Outil |
|---------|------|-------|
| `docker/` | Image multi-stage de l'API | Docker |
| `terraform/` | VPC, EKS, RDS PostgreSQL, ElastiCache Redis, ECR | Terraform (AWS) |
| `ansible/` | Provisionnement du GitLab Runner (EC2) | Ansible |
| `gitlab/` | Pipeline CI complet (lint→test→build→scan→release) | GitLab CI |
| `k8s/` | Manifestes applicatifs, base + overlays staging/prod | Kustomize |
| `argocd/` | Applications GitOps (staging auto, prod manuelle) | ArgoCD |
| `monitoring/` | Stack Prometheus/Grafana + alertes (golden signals) | kube-prometheus-stack |

L'API expose déjà `/metrics` (histogramme latence/erreurs — `apps/api/src/middleware/metrics.ts`)
et `/health` + `/health/ready` (probes K8s) : **l'application est prête pour cette chaîne**.

## Parcours conseillé (ordre d'apprentissage)

1. **Docker** — construire et lancer l'image localement (`docker build -f devops/docker/Dockerfile.api .`)
2. **Terraform** — lire `main.tf` → `vpc.tf` → `eks.tf` → `rds.tf` ; puis `init/plan/apply`
3. **Kubernetes** — déployer à la main une fois (`kubectl apply -k k8s/overlays/staging`) pour COMPRENDRE avant d'automatiser
4. **GitLab CI** — brancher le pipeline, voir une image poussée dans ECR
5. **ArgoCD** — installer, créer les Applications, couper `kubectl` à la CI
6. **Prometheus/Grafana** — installer la stack, importer le dashboard, déclencher une alerte volontairement
7. **Ansible** — provisionner un runner dédié

Chaque fichier est **abondamment commenté** avec le *pourquoi* (vs alternatives).
Le détail complet, les commandes exactes et les pièges sont dans la **bible**.

## Coût estimé du lab (staging, eu-west-3)

| Ressource | ≈ €/mois |
|-----------|----------|
| EKS control plane | 70 |
| 2× t3.medium (Spot) | 18 |
| NAT gateway | 32 |
| RDS db.t4g.micro | 13 |
| ElastiCache t4g.micro | 11 |
| **Total lab** | **~145 €/mois** → détruire avec `terraform destroy` après chaque session d'apprentissage ! |

> 💡 Alternative fauchée : remplacer EKS par **k3s sur une seule EC2 t3.large**
> (~30 €/mois) — toute la chaîne (ArgoCD, Prometheus, kustomize) fonctionne
> pareil. La bible explique la variante.
