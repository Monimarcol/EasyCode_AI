from flask import Flask, request, Response, stream_with_context
from openai import OpenAI
import time

app = Flask(__name__)

client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio"
)

MODEL_NAME = "qwen2.5-coder-3b-instruct-mlx"

@app.route('/fix', methods=['POST'])
def fix_code():

    data = request.json

    code_context = data.get(
        'code_context',
        ''
    )

    error_message = data.get(
        'error_message',
        ''
    )

    def generate():
            start = time.time()

            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": """
        You are a code patch generator.

You MUST return ONLY valid JSON.

The response MUST start with JSON_START.
The response MUST end with JSON_END.

Never explain.
Never think.
Never reason.
Never use markdown.
Never output code fences.
Never output any text outside JSON.

Supported patch types:

replace
insert_before
insert_after
delete

Format:

JSON_START
{
  "changes": [
    {
      "type": "replace",
      "old": "...",
      "new": "..."
    }
  ]
}
JSON_END

Rules:

- Fix ONLY the requested error.
- Preserve indentation exactly.
- "old" MUST exactly match the supplied code.
- Never rewrite the whole file.
"""
                    },
                    {
                        "role": "user",
                        "content": f"""
        FILE

        {code_context}

        ERROR

        {error_message}

        Return ONLY JSON_START ... JSON_END
        """
                    }
                ],
                temperature=0,
                max_completion_tokens=180,
                stream=False
            )

            print("=" * 80)
            print(response)
            print("=" * 80)
            print("CONTENT:")
            print(repr(response.choices[0].message.content))

            print("REASONING:")
            print(getattr(response.choices[0].message, "reasoning_content", None))

            content = response.choices[0].message.content

            print(content, flush=True)

            if content:
                yield content
            print(f"Model took: {time.time() - start:.2f} seconds")
    return Response(
        stream_with_context(generate()),
        mimetype='text/plain'
    )



@app.route('/chat', methods=['POST'])
def chat():

    data = request.json

    code_context = data.get(
        'code_context',
        ''
    )

    user_message = data.get(
        'message',
        ''
    )

    def generate():

        stream = client.chat.completions.create(
            model=MODEL_NAME,

            messages=[
                {
                    "role": "system",
                    "content": """
You are a senior software engineer and AI coding assistant.

You help users:

- Understand code
- Refactor code
- Improve code quality
- Remove duplicate logic
- Add features
- Explain errors
- Generate code
- Answer programming questions

Rules:

- Give practical answers.
- Use markdown formatting.
- If code changes are required,
  show the modified code snippet.
- Do not generate patch JSON.
- Do not generate JSON_START/JSON_END.
- Do not generate CODE_START/CODE_END.
- Respond like a coding assistant.
"""
                },

                {
                    "role": "user",
                    "content": f"""
CODE CONTEXT:

{code_context}

USER REQUEST:

{user_message}
"""
                }
            ],

            temperature=0,
            max_completion_tokens=300,
            stream=True
        )

        for chunk in stream:

            content = (
                chunk.choices[0]
                .delta
                .content
            )

            if content:
                yield content

    return Response(
        stream_with_context(generate()),
        mimetype='text/plain'
    )


if __name__ == '__main__':

    print(
        "🚀 Debug Assistant Server running on http://127.0.0.1:8000"
    )

    app.run(
        port=8000,
        debug=False,
        use_reloader=False
    )