export async function streamAssistantResponse(
    endpoint: string,
    requestBody: object,
    onToken: (token: string) => void
): Promise<string> {

    const response = await fetch(
        endpoint,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        }
    );

    if (!response.ok || !response.body) {
        throw new Error('Server connection failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullResponse = "";

    while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        const chunk = decoder.decode(
            value,
            { stream: true }
        );

        fullResponse += chunk;
        onToken(chunk);
    }

    return fullResponse;
}