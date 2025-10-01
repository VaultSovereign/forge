TFVARS?=envs/dev.tfvars
.PHONY: init plan apply import-all

init:
	cd infra/gcp && terraform init

plan:
	cd infra/gcp && terraform plan -var-file=$(TFVARS)

apply:
	cd infra/gcp && terraform apply -var-file=$(TFVARS)

import-all:
	@echo "Run the printed import commands from imports.txt"
