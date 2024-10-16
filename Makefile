DOCKER_CMP := docker compose
PROJECT_NAME := transendence-codam

all:
	@$(DOCKER_CMP) -p $(PROJECT_NAME) up --build

down:
	@$(DOCKER_CMP) -p $(PROJECT_NAME) down

clean:
	@$(DOCKER_CMP) -p $(PROJECT_NAME) down --remove-orphans
	@$(DOCKER_CMP) -p $(PROJECT_NAME) down --rmi local
	@$(DOCKER_CMP) -p $(PROJECT_NAME) down -v

fclean: clean
	@docker volume prune -f --filter "label=com.docker.compose.project=$(PROJECT_NAME)"
	@docker network prune -f --filter "label=com.docker.compose.project=$(PROJECT_NAME)"
	@echo "Cleanup completed."

check:
	npx depcheck

.PHONY: all down clean fclean check
