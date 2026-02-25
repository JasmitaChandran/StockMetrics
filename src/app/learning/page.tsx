import { LearningAssistant } from '@/components/learning/learning-assistant';
import { loadLearningDocs } from '@/lib/learning/content';

export default function LearningPage() {
  const docs = loadLearningDocs();
  return <LearningAssistant docs={docs} />;
}
