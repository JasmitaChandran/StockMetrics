import type { AiProvider } from '@/types';
import {
  answerLearningQuestionHeuristic,
  buildBeginnerAssessment,
  generateAiInsights,
  parseScreenerQueryHeuristic,
  suggestPeersHeuristic,
  summarizeStatement,
} from './heuristics';

export const heuristicAiProvider: AiProvider = {
  id: 'heuristic',
  name: 'Rules-Based Analysis',
  async summarizeStatement(input) {
    return summarizeStatement(input);
  },
  async generateInsights(input) {
    return generateAiInsights(input);
  },
  async beginnerAssessment(input) {
    return buildBeginnerAssessment(input);
  },
  async suggestPeers(input) {
    return suggestPeersHeuristic(input);
  },
  async answerLearningQuestion({ question, docs }) {
    return answerLearningQuestionHeuristic(question, docs);
  },
  async parseScreenerQuery({ query }) {
    return parseScreenerQueryHeuristic(query);
  },
};
