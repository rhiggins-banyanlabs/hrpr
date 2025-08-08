import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/config/supabaseClient';
import { embeddingService } from '@/services/embedding.service';

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Search for similar exhibitors
    const { data, error } = await supabase
      .rpc('search_exhibitors', {
        query_embedding: queryEmbedding,
        match_count: limit,
        similarity_threshold: 0.7
      });

    if (error) {
      console.error('Database search error:', error);
      return NextResponse.json(
        { error: 'Failed to search exhibitors' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      results: data || [],
      query: query,
      count: data?.length || 0
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const boothNumber = searchParams.get('booth');
    const companyName = searchParams.get('company');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    let query = supabase
      .from('exhibitors')
      .select('*', { count: 'exact' });

    if (boothNumber) {
      query = query.ilike('booth_number', `%${boothNumber}%`);
    }

    if (companyName) {
      query = query.ilike('company_name', `%${companyName}%`);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch exhibitors' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exhibitors: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    });

  } catch (error) {
    console.error('GET API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}