select
  table_schema,
  table_name,
  table_type
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'customers',
    'crm_customers',
    'qa_answers',
    'unified_messages'
  )
order by table_name;
