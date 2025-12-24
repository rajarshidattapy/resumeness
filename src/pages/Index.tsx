import { MainLayout } from '@/components/layout/MainLayout';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { LaTeXEditor } from '@/components/editor/LaTeXEditor';

const Index = () => {
  return (
    <MainLayout
      chatPanel={<ChatPanel />}
      editorPanel={<LaTeXEditor />}
    />
  );
};

export default Index;
