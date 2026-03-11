set shell := ["zsh", "-c"]

default:
	@just --list

showver:
	@node -p "require('./package.json').version"

bump level="patch":
	npm version {{level}}
	@echo "Bumped version to v$$(node -p \"require('./package.json').version\")"

patch:
	just bump patch

minor:
	just bump minor

major:
	just bump major

tag:
	git push
	git push origin v$$(node -p "require('./package.json').version")

release level="patch":
	just bump {{level}}
	just tag
