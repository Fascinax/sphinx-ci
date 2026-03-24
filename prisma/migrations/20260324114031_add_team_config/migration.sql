-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "anthropicApiKey" TEXT,
ADD COLUMN     "quizConfig" JSONB NOT NULL DEFAULT '{"numQuestions":10,"passingScore":70,"maxAttempts":3,"language":"fr","keyword":"/sphinx"}';
