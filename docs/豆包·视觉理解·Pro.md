豆包·视觉理解·Pro

ID：ep-20241217180248-hmtff
模型：Doubao-vision-pro-32k


```
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.['ARK_API_KEY'],
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

// Image input:
async function main() {
  const response = await openai.chat.completions.create({
    apiKey: process.env['ARK_API_KEY'],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '这是哪里？' },
          {
            type: 'image_url',
            image_url: {
              url: 'https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg',
            },
          },
        ],
      },
    ],
    model: 'ep-20241217180248-hmtff',
  });

  console.log(response.choices[0]);
}

main();
```