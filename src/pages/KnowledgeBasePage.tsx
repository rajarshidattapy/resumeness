import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Database, Plus, Briefcase, Award, Code, Trash2, ChevronDown,
  ArrowLeft, Search, Edit2, Save, X, Tag, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResumeStore, KnowledgeItem } from '@/stores/useResumeStore';
import { getCurrentUserId } from '@/lib/db/knowledgeBaseDb';
import { QuizDialog } from '@/components/knowledge/QuizDialog';
import { cn } from '@/lib/utils';

const typeIcons = {
  project: Code,
  skill: Database,
  experience: Briefcase,
  achievement: Award,
};

const typeColors = {
  project: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  skill: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  experience: 'bg-primary/10 text-primary border-primary/20',
  achievement: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
};

interface KBItemCardProps {
  item: KnowledgeItem;
  onEdit: (item: KnowledgeItem) => void;
  onRemove: () => void;
}

const KBItemCard = ({ item, onEdit, onRemove }: KBItemCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const userId = getCurrentUserId();
  const Icon = typeIcons[item.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/30 transition-colors rounded-t-xl"
      >
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", typeColors[item.type])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-foreground truncate">{item.title}</p>
          <p className="text-sm text-muted-foreground capitalize">{item.type}</p>
        </div>
        <ChevronDown className={cn(
          "w-5 h-5 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-border/50">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {item.content}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {item.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs rounded-md bg-secondary text-secondary-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  {userId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsQuizOpen(true);
                      }}
                    >
                      <GraduationCap className="w-3.5 h-3.5 mr-1" />
                      Quiz
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(item);
                    }}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {userId && (
        <QuizDialog
          userId={userId}
          itemId={item.id}
          itemTitle={item.title}
          open={isQuizOpen}
          onOpenChange={setIsQuizOpen}
        />
      )}
    </motion.div>
  );
};

interface ItemFormData {
  type: KnowledgeItem['type'];
  title: string;
  content: string;
  tags: string;
}

const KnowledgeBasePage = () => {
  const { 
    knowledgeBase, 
    knowledgeBaseLoading,
    knowledgeBaseError,
    loadKnowledgeBase,
    addKnowledgeItem, 
    updateKnowledgeItem, 
    removeKnowledgeItem 
  } = useResumeStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<KnowledgeItem['type'] | 'all'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<ItemFormData>({
    type: 'project',
    title: '',
    content: '',
    tags: '',
  });

  useEffect(() => {
    loadKnowledgeBase();
  }, [loadKnowledgeBase]);

  const filteredItems = knowledgeBase.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    setIsSaving(true);
    const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    try {
      if (editingItem) {
        await updateKnowledgeItem(editingItem.id, {
          type: formData.type,
          title: formData.title,
          content: formData.content,
          tags,
        });
        setEditingItem(null);
      } else {
        await addKnowledgeItem({
          type: formData.type,
          title: formData.title,
          content: formData.content,
          tags,
        });
      }

      setFormData({ type: 'project', title: '', content: '', tags: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeKnowledgeItem(id);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      title: item.title,
      content: item.content,
      tags: item.tags.join(', '),
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingItem(null);
    setFormData({ type: 'project', title: '', content: '', tags: '' });
  };

  const types: (KnowledgeItem['type'] | 'all')[] = ['all', 'project', 'skill', 'experience', 'achievement'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/resume">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Database className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Knowledge Base</h1>
                  <p className="text-sm text-muted-foreground">{knowledgeBase.length} items stored</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setIsAdding(true)} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge base..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {types.map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className="capitalize"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Add/Edit Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-card rounded-xl border border-border p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={handleCancel}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Type</label>
                    <div className="flex gap-2">
                      {(['project', 'skill', 'experience', 'achievement'] as const).map((type) => {
                        const Icon = typeIcons[type];
                        return (
                          <Button
                            key={type}
                            variant={formData.type === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFormData(d => ({ ...d, type }))}
                            className="capitalize"
                          >
                            <Icon className="w-4 h-4 mr-1" />
                            {type}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Title</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(d => ({ ...d, title: e.target.value }))}
                      placeholder="E.g., Built E-commerce Platform"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Content</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData(d => ({ ...d, content: e.target.value }))}
                      placeholder="Describe the project, skill, or achievement in detail..."
                      className="w-full min-h-[120px] px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      <Tag className="w-4 h-4 inline mr-1" />
                      Tags (comma-separated)
                    </label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData(d => ({ ...d, tags: e.target.value }))}
                      placeholder="React, TypeScript, AWS, ..."
                    />
                  </div>

                  {knowledgeBaseError && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                      {knowledgeBaseError}
                    </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button 
                      onClick={handleSubmit} 
                      className="bg-primary hover:bg-primary/90"
                      disabled={isSaving}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {isSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {knowledgeBaseLoading && (
          <div className="text-center py-16">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Loading knowledge base...</p>
          </div>
        )}

        {/* Items Grid */}
        {!knowledgeBaseLoading && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <KBItemCard
                  key={item.id}
                  item={item}
                  onEdit={handleEdit}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!knowledgeBaseLoading && filteredItems.length === 0 && (
          <div className="text-center py-16">
            <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Start by adding your projects, skills, and achievements'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Item
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default KnowledgeBasePage;