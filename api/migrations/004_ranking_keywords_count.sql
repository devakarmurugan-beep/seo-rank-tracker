-- Efficient server-side count of distinct keywords ranking in a date range.
-- Called via supabase.rpc('ranking_keywords_count', { p_site_id, p_start, p_end })
CREATE OR REPLACE FUNCTION ranking_keywords_count(
  p_site_id UUID,
  p_start   DATE,
  p_end     DATE
) RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COUNT(DISTINCT kh.keyword_id)::INTEGER
  FROM keyword_history kh
  JOIN keywords k ON k.id = kh.keyword_id
  WHERE k.site_id = p_site_id
    AND kh.date BETWEEN p_start AND p_end;
$$;
