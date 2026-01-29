import { createChatOllama } from './langchain-openrouter';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export async function testOllamaConnection() {
  try {
    console.log('Testing Ollama connection...');
    
    const llm = createChatOllama({
      modelName: 'glm-4.7:cloud',
      temperature: 0.7
    });

    const messages = [
      new SystemMessage('You are a helpful assistant. Respond briefly.'),
      new HumanMessage('Hello! Can you confirm you are working?')
    ];

    console.log('Sending test message to Ollama...');
    const result = await llm.invoke(messages);
    
    console.log('✅ Ollama connection successful!');
    console.log('Response:', result.content);
    
    return true;
  } catch (error) {
    console.error('❌ Ollama connection failed:', error);
    console.error('Make sure Ollama is running and the model is available.');
    console.error('Run: ollama pull glm-4.7:cloud');
    return false;
  }
}

// Test function for resume agent with Ollama
export async function testResumeAgentOllama() {
  try {
    console.log('Testing Resume Agent with Ollama...');
    
    const { ResumeAgent } = await import('./resume-agent-langchain');
    
    const agent = new ResumeAgent(
      'glm-4.7:cloud',
      [
        {
          id: '1',
          type: 'skill',
          title: 'JavaScript Development',
          content: 'Experienced in React, Node.js, and TypeScript development',
          tags: ['javascript', 'react', 'nodejs', 'typescript']
        }
      ],
      '\\section{Skills}\n\\cvitem{Programming}{JavaScript, Python, Java}',
      'Looking for a JavaScript developer with React experience'
    );

    console.log('Initializing agent...');
    // No need to call initialize - it's done automatically
    
    console.log('Testing agent response...');
    const response = await agent.chat('Improve my skills section for this JavaScript role');
    
    console.log('✅ Resume Agent test successful!');
    console.log('Response:', response);
    
    return true;
  } catch (error) {
    console.error('❌ Resume Agent test failed:', error);
    return false;
  }
}

// Run the test when this file is executed directly
console.log('Starting Ollama connection test...');
testOllamaConnection().then((success) => {
  if (success) {
    console.log('Test completed successfully!');
    process.exit(0);
  } else {
    console.log('Test failed!');
    process.exit(1);
  }
}).catch((error) => {
  console.error('Test error:', error);
  process.exit(1);
});