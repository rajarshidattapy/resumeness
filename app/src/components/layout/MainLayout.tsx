import { ReactNode } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Sidebar } from './Sidebar';
import { GripVertical } from 'lucide-react';

interface MainLayoutProps {
  chatPanel: ReactNode;
  editorPanel: ReactNode;
}

export const MainLayout = ({ chatPanel, editorPanel }: MainLayoutProps) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content - Resizable Split View */}
      <div className="flex-1 flex overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Chat Panel */}
          <Panel defaultSize={30} minSize={20} maxSize={50} className="flex flex-col">
            <div className="h-full w-full border-r border-border/50">
              {chatPanel}
            </div>
          </Panel>

          {/* Resize Handle */}
          <PanelResizeHandle className="w-1.5 bg-border/20 hover:bg-primary/20 transition-colors flex items-center justify-center cursor-col-resize group z-50">
            <div className="h-8 w-1 rounded-full bg-border group-hover:bg-primary transition-colors flex items-center justify-center">
              <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </PanelResizeHandle>

          {/* Editor Panel */}
          <Panel defaultSize={70} minSize={30}>
            <div className="h-full w-full flex flex-col overflow-hidden">
              {editorPanel}
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* Background Glow Effect */}
      <div
        className="fixed inset-0 pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, hsl(187 92% 50% / 0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(187 92% 50% / 0.02) 0%, transparent 50%)',
        }}
      />
    </div>
  );
};
