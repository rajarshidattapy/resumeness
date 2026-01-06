import { useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { LaTeXEditor } from '@/components/editor/LaTeXEditor';
import { useResumeStore } from '@/stores/useResumeStore';

const Index = () => {
  const loadKnowledgeBase = useResumeStore((state) => state.loadKnowledgeBase);

  useEffect(() => {
    // Load knowledge base from database on mount
    loadKnowledgeBase();
  }, [loadKnowledgeBase]);

  return (
    <MainLayout
      chatPanel={<ChatPanel />}
      editorPanel={<LaTeXEditor />}
    />
  );
};

export default Index;
