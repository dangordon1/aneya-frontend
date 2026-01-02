import { useState, useEffect } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Activity,
  FileText,
  Pill,
  Stethoscope,
  BarChart3,
  Calendar,
  Users,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface FeedbackStats {
  total_feedback_count: number;
  feedback_by_type: Record<string, number>;
  feedback_by_sentiment: {
    positive: number;
    negative: number;
  };
  positive_percentage: number;
  top_diagnoses: Array<{
    diagnosis: string;
    positive: number;
    negative: number;
    correct: number;
  }>;
  top_drugs: Array<{
    drug: string;
    positive: number;
    negative: number;
  }>;
  recent_feedback: Array<{
    id: string;
    type: string;
    sentiment: string;
    created_at: string;
  }>;
}

export function FeedbackDashboard() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ days: days.toString() });
      if (selectedType) {
        params.append('feedback_type', selectedType);
      }

      const response = await fetch(`${API_URL}/api/feedback/stats?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch feedback statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching feedback stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [days, selectedType]);

  const getFeedbackTypeIcon = (type: string) => {
    switch (type) {
      case 'transcription':
        return <Activity className="w-4 h-4" />;
      case 'summary':
        return <FileText className="w-4 h-4" />;
      case 'diagnosis':
        return <Stethoscope className="w-4 h-4" />;
      case 'drug_recommendation':
        return <Pill className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const formatFeedbackType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-aneya-cream">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-aneya-teal animate-spin mx-auto mb-4" />
          <p className="text-aneya-navy">Loading feedback statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-aneya-cream">
        <div className="bg-white rounded-lg p-6 shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 px-4 py-2 bg-aneya-teal text-white rounded-lg hover:bg-opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="min-h-screen bg-aneya-cream p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-aneya-navy mb-2">
            RLHF Feedback Dashboard
          </h1>
          <p className="text-aneya-text-secondary">
            Monitor user feedback on AI-generated content for continuous improvement
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-aneya-teal" />
              <label className="text-sm font-medium text-aneya-navy">Time Range:</label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aneya-teal"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-aneya-teal" />
              <label className="text-sm font-medium text-aneya-navy">Feedback Type:</label>
              <select
                value={selectedType || ''}
                onChange={(e) => setSelectedType(e.target.value || null)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-aneya-teal"
              >
                <option value="">All Types</option>
                <option value="transcription">Transcription</option>
                <option value="summary">Summary</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="drug_recommendation">Drug Recommendation</option>
              </select>
            </div>

            <button
              onClick={fetchStats}
              className="ml-auto px-4 py-1.5 bg-aneya-teal text-white rounded-lg hover:bg-opacity-90 flex items-center gap-2 text-sm"
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Feedback */}
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-aneya-teal">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 text-aneya-teal" />
              <span className="text-2xl font-bold text-aneya-navy">{stats.total_feedback_count}</span>
            </div>
            <h3 className="text-sm font-medium text-aneya-text-secondary">Total Feedback</h3>
          </div>

          {/* Positive Rate */}
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-aneya-navy">{stats.positive_percentage}%</span>
            </div>
            <h3 className="text-sm font-medium text-aneya-text-secondary">Positive Rate</h3>
          </div>

          {/* Positive Feedback */}
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-green-400">
            <div className="flex items-center justify-between mb-2">
              <ThumbsUp className="w-8 h-8 text-green-600" />
              <span className="text-2xl font-bold text-aneya-navy">{stats.feedback_by_sentiment.positive}</span>
            </div>
            <h3 className="text-sm font-medium text-aneya-text-secondary">Thumbs Up</h3>
          </div>

          {/* Negative Feedback */}
          <div className="bg-white rounded-lg p-6 shadow-sm border-l-4 border-red-400">
            <div className="flex items-center justify-between mb-2">
              <ThumbsDown className="w-8 h-8 text-red-600" />
              <span className="text-2xl font-bold text-aneya-navy">{stats.feedback_by_sentiment.negative}</span>
            </div>
            <h3 className="text-sm font-medium text-aneya-text-secondary">Thumbs Down</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Feedback by Type */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-aneya-navy mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-aneya-teal" />
              Feedback by Type
            </h2>
            <div className="space-y-3">
              {Object.entries(stats.feedback_by_type).map(([type, count]) => {
                const percentage = stats.total_feedback_count > 0
                  ? ((count / stats.total_feedback_count) * 100).toFixed(1)
                  : 0;

                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {getFeedbackTypeIcon(type)}
                        <span className="font-medium text-aneya-navy">{formatFeedbackType(type)}</span>
                      </div>
                      <span className="text-aneya-text-secondary">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-aneya-teal rounded-full h-2 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Diagnoses */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-aneya-navy mb-4 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-aneya-teal" />
              Top Diagnoses
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.top_diagnoses.length > 0 ? (
                stats.top_diagnoses.map((diag, idx) => {
                  const total = diag.positive + diag.negative;
                  const positiveRate = total > 0 ? ((diag.positive / total) * 100).toFixed(0) : 0;

                  return (
                    <div key={idx} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium text-aneya-navy flex-1">{diag.diagnosis}</h4>
                        {diag.correct > 0 && (
                          <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {diag.correct}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1 text-green-600">
                          <ThumbsUp className="w-3 h-3" />
                          {diag.positive}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <ThumbsDown className="w-3 h-3" />
                          {diag.negative}
                        </span>
                        <span className="ml-auto text-aneya-text-secondary">
                          {positiveRate}% positive
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-aneya-text-secondary">No diagnosis feedback yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Drugs */}
        {stats.top_drugs.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
            <h2 className="text-xl font-semibold text-aneya-navy mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-aneya-teal" />
              Top Drug Recommendations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.top_drugs.map((drug, idx) => {
                const total = drug.positive + drug.negative;
                const positiveRate = total > 0 ? ((drug.positive / total) * 100).toFixed(0) : 0;

                return (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-aneya-navy mb-2">{drug.drug}</h4>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="flex items-center gap-1 text-green-600">
                        <ThumbsUp className="w-3 h-3" />
                        {drug.positive}
                      </span>
                      <span className="flex items-center gap-1 text-red-600">
                        <ThumbsDown className="w-3 h-3" />
                        {drug.negative}
                      </span>
                      <span className="ml-auto text-aneya-text-secondary">
                        {positiveRate}% positive
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Feedback */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-aneya-navy mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-aneya-teal" />
            Recent Feedback
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-aneya-text-secondary">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-aneya-text-secondary">Sentiment</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-aneya-text-secondary">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_feedback.length > 0 ? (
                  stats.recent_feedback.map((feedback) => (
                    <tr key={feedback.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 text-sm text-aneya-navy">
                          {getFeedbackTypeIcon(feedback.type)}
                          {formatFeedbackType(feedback.type)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          feedback.sentiment === 'positive'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {feedback.sentiment === 'positive' ? (
                            <ThumbsUp className="w-3 h-3" />
                          ) : (
                            <ThumbsDown className="w-3 h-3" />
                          )}
                          {feedback.sentiment}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-aneya-text-secondary">
                        {formatDate(feedback.created_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-sm text-aneya-text-secondary">
                      No recent feedback
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
