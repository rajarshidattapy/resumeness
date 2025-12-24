import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  chatPanel: ReactNode;
  editorPanel: ReactNode;
}

export const MainLayout = ({ chatPanel, editorPanel }: MainLayoutProps) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-[420px] min-w-[380px] border-r border-border/50 flex flex-col"
        >
          {chatPanel}
        </motion.div>

        {/* Editor Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          {editorPanel}
        </motion.div>
      </div>

      {/* Background Glow Effect */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, hsl(187 92% 50% / 0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(187 92% 50% / 0.02) 0%, transparent 50%)',
        }}
      />
    </div>
  );
};
