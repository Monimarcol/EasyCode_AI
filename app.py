from flask import Flask, request, Response, stream_with_context
from openai import OpenAI
import time

app = Flask(__name__)

client = OpenAI(
    base_url="http://localhost:1234/v1",
    api_key="lm-studio"
)

MODEL_NAME = "qwen2.5-coder-7b-instruct-mlx"

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

    print("========== INCOMING FIX REQUEST ==========")
    print("CODE CONTEXT:")
    print(code_context)
    print("ERROR MESSAGE:")
    print(error_message)
    print("==========================================")

    def generate():
            start = time.time()

            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {
                        "role": "system",
                        "content": """
You are a strict code patch generator.

Return ONLY patch blocks.

Patch format:

PATCH_START
TYPE: replace
OLD:
exact text from FILE
NEW:
replacement text
PATCH_END

Supported TYPE values:

replace
insert_before
insert_after
delete

Rules:

- Before generating patches, inspect PROJECT CONTEXT, RELATED PROJECT FILES, SEARCHED REPOSITORY CONTEXT, and CURRENT FILE.
- If an undefined name looks like a typo of a symbol found in repository context, replace it with that symbol.
- If that corrected symbol is not imported in CURRENT FILE, also add the required import.
- Return all required patches together in one response.
- Do not create a new function in CURRENT FILE if the function already exists in repository context.
- Prefer importing existing project functions over redefining them.
- Fix ALL errors listed in ERROR.
- Return one small patch block per fix.
- NEW must contain code only.
- Never add comments in OLD.
- Never add comments in NEW.
- Never explain the fix inside OLD or NEW.
- Do not add text like "# Add missing..." anywhere.
- OLD must be copied exactly from FILE.
- Never rewrite the whole file.
- Never replace large multi-line blocks.
- OLD must exactly match text from FILE.
- NEW must contain only replacement text.
- For insert_before:
  - OLD is the anchor text.
  - NEW is the text to insert before OLD.
- For insert_after:
  - OLD is the anchor text.
  - NEW is the text to insert after OLD.
- For delete:
  - OLD is the text to delete.
  - NEW must be empty.
- Do not use JSON.
- Do not use markdown.
- Do not explain.

Planning protocol:

Before writing PATCH_START blocks, internally decide:

1. What is the exact broken symbol or line?
2. Is there a similar existing symbol in RELATED PROJECT FILES or SEARCHED REPOSITORY CONTEXT?
3. If yes, use that existing symbol.
4. If using a symbol from another file, check whether CURRENT FILE already imports it.
5. If not imported, add an insert_before patch for the import.
6. Then add the replace patch for the broken usage.

Return only PATCH_START blocks.
Do not output the plan.

Example:

FILE:
data = pd.read_csv(file_path)
print(dat.head())
pritn("done")

ERROR:
1. "pd" is not defined
2. "dat" is not defined
3. "pritn" is not defined

PATCH_START
TYPE: insert_before
OLD:
data = pd.read_csv(file_path)
NEW:
import pandas as pd

PATCH_END

PATCH_START
TYPE: replace
OLD:
dat.head()
NEW:
data.head()
PATCH_END

PATCH_START
TYPE: replace
OLD:
pritn
NEW:
print
PATCH_END

Planning example:

CURRENT FILE:
total = calculate_totle(100, 10)

SEARCHED REPOSITORY CONTEXT:
SEARCH MATCH:
math_utils.py

CONTENT:
def calculate_total(price, tax):
    return price + tax

Expected response:

PATCH_START
TYPE: insert_before
OLD:
total = calculate_totle(100, 10)
NEW:
from math_utils import calculate_total

PATCH_END

PATCH_START
TYPE: replace
OLD:
total = calculate_totle(100, 10)
NEW:
total = calculate_total(100, 10)
PATCH_END
"""
                    },
                    {
                        "role": "user",
                        "content": f"""
        FILE

        {code_context}

        ERROR

        {error_message}

        Return ONLY PATCH_START ... PATCH_END blocks
        """
                    }
                ],
                temperature=0,
                max_completion_tokens=500,
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