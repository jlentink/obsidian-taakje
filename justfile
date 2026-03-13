set shell := ["zsh", "-c"]

version := `node -p "require('./package.json').version"`

default:
	@just --list

showver:
	@echo {{version}}

bump level="patch":
	npm version {{level}}
	@echo Bumped version to {{version}}

patch:
	just bump patch

minor:
	just bump minor

major:
	just bump major

tag:
	git push
	@if git ls-remote --exit-code --tags origin {{version}} >/dev/null 2>&1; then \
		echo "Tag {{version}} already exists on origin"; \
	else \
		git tag -f {{version}} && git push origin {{version}}; \
	fi

release level="patch":
	just bump {{level}}
	just tag

build:
  npm install
  npm run build