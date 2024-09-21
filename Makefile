DOCKER_CMP := docker compose

all:
	@$(DOCKER_CMP) up --build

down:
	@$(DOCKER_CMP) -f docker-compose.yml down

clean:
	@$(DOCKER_CMP) down --remove-orphans
	@$(DOCKER_CMP) down --rmi all
	@$(DOCKER_CMP) down -v

fclean: clean
	@docker volume prune -f
	@docker network prune -f
	@echo "Cleanup completed."

check:
	npx depcheck

.PHONY: all down clean fclean check
