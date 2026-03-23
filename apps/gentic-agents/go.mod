module github.com/daniel-dihardja/gentic-agents

go 1.26.1

require (
	github.com/daniel-dihardja/gentic v0.1.0
	github.com/joho/godotenv v1.5.1
)

// Point at local gentic checkout (streaming, ChatStream). Remove when a tagged release includes streaming.
replace github.com/daniel-dihardja/gentic => ../../../../gentic
