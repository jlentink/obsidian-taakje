set shell := ["zsh", "-c"]

version := `node -p "require('./package.json').version"`

default:
	@just --list

showver:
	@echo {{version}}

bump level="patch":
	npm version {{level}}
	@echo Bumped version to v{{version}}

patch:
	just bump patch

minor:
	just bump minor

major:
	just bump major

tag:
	git push
	@if git ls-remote --exit-code --tags origin v{{version}} >/dev/null 2>&1; then \
		echo "Tag v{{version}} already exists on origin"; \
	else \
		git push origin v{{version}}; \
	fi

release level="patch":
	just bump {{level}}
	just tag
