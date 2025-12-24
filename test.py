from transformers import pipeline

pipe = pipeline("text-generation", model="gorilla-llm/gorilla-openfunctions-v2")
messages = [
    {"role": "user", "content": "Who are you?"},
]
pipe(messages)