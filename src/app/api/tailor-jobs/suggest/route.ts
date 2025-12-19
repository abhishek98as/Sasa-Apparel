import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { ObjectId } from 'mongodb';
import { authOptions } from '@/lib/auth';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

// Get skill-based tailor suggestions for a job
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'manager'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const styleId = searchParams.get('styleId');
    const pcsNeeded = parseInt(searchParams.get('pcs') || '0');

    if (!styleId || !ObjectId.isValid(styleId)) {
      return NextResponse.json(
        { success: false, error: 'Valid styleId is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get style info
    const style = await db
      .collection(COLLECTIONS.STYLES)
      .findOne({ _id: new ObjectId(styleId) });

    if (!style) {
      return NextResponse.json(
        { success: false, error: 'Style not found' },
        { status: 404 }
      );
    }

    // Get all active tailors
    const tailors = await db
      .collection('tailors')
      .find({ isActive: true })
      .toArray();

    // Get pending work per tailor
    const pendingWork = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        {
          $match: {
            status: { $in: ['pending', 'in-progress'] },
          },
        },
        {
          $group: {
            _id: '$tailorId',
            pendingPcs: {
              $sum: { $subtract: ['$issuedPcs', { $ifNull: ['$returnedPcs', 0] }] },
            },
          },
        },
      ])
      .toArray();

    // Get historical performance for this style
    const stylePerformance = await db
      .collection(COLLECTIONS.TAILOR_JOBS)
      .aggregate([
        {
          $match: {
            styleId: new ObjectId(styleId),
            status: 'completed',
          },
        },
        {
          $group: {
            _id: '$tailorId',
            completedPcs: { $sum: '$returnedPcs' },
            jobCount: { $sum: 1 },
            avgDays: {
              $avg: {
                $divide: [
                  { $subtract: ['$returnDate', '$issueDate'] },
                  86400000,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    // Score and rank tailors
    const suggestions = tailors.map((tailor) => {
      const pending = pendingWork.find(
        (p) => p._id.toString() === tailor._id.toString()
      );
      const performance = stylePerformance.find(
        (p) => p._id.toString() === tailor._id.toString()
      );

      const pendingPcs = pending?.pendingPcs || 0;
      const dailyCapacity = tailor.dailyCapacity || 50;
      const availableCapacity = Math.max(0, dailyCapacity * 7 - pendingPcs);

      // Check if tailor has skill matching style fabric type
      const hasSkill = tailor.skills?.some(
        (skill: string) =>
          skill.toLowerCase().includes(style.fabricType?.toLowerCase() || '') ||
          style.fabricType?.toLowerCase().includes(skill.toLowerCase())
      );

      // Calculate score (higher is better)
      let score = 0;

      // Capacity score (0-40 points)
      score += Math.min(40, (availableCapacity / dailyCapacity) * 10);

      // Skill match (20 points)
      if (hasSkill) score += 20;

      // Historical performance for this style (0-30 points)
      if (performance) {
        score += Math.min(20, performance.completedPcs / 100);
        if (performance.avgDays && performance.avgDays < 5) {
          score += 10; // Fast turnaround bonus
        }
      }

      // Pending workload penalty
      if (pendingPcs > dailyCapacity * 5) {
        score -= 20;
      }

      const daysToComplete = pcsNeeded > 0 ? Math.ceil(pcsNeeded / dailyCapacity) : 0;

      return {
        _id: tailor._id,
        name: tailor.name,
        phone: tailor.phone,
        skills: tailor.skills || [],
        dailyCapacity,
        pendingPcs,
        availableCapacity,
        hasSkillMatch: hasSkill,
        pastExperience: performance
          ? {
              completedPcs: performance.completedPcs,
              avgDays: Math.round(performance.avgDays || 0),
            }
          : null,
        estimatedDays: daysToComplete,
        score: Math.round(score),
        recommendation:
          score >= 50
            ? 'highly-recommended'
            : score >= 30
            ? 'recommended'
            : score >= 10
            ? 'possible'
            : 'not-recommended',
      };
    });

    // Sort by score (best first)
    suggestions.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      data: {
        style: {
          _id: style._id,
          name: style.name,
          code: style.code,
          fabricType: style.fabricType,
        },
        suggestions: suggestions.slice(0, 10), // Top 10
        pcsRequested: pcsNeeded,
      },
    });
  } catch (error) {
    console.error('Tailor suggestions GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

