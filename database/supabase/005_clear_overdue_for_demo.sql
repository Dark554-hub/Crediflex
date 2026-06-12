begin;

update credit_installments
set
  due_date = date '2026-06-04',
  status = case
    when paid_amount > 0 and paid_amount < scheduled_amount + late_fee_amount then 'partial'::installment_status
    else 'pending'::installment_status
  end,
  updated_at = now()
where
  due_date < date '2026-06-04'
  and status in ('pending', 'partial', 'overdue');

update credit_installments
set
  status = case
    when paid_amount > 0 and paid_amount < scheduled_amount + late_fee_amount then 'partial'::installment_status
    else 'pending'::installment_status
  end,
  updated_at = now()
where status = 'overdue';

update collection_items
set
  status = case
    when collected_amount > 0 and collected_amount < expected_amount then 'partial'::collection_item_status
    when collected_amount >= expected_amount then 'paid'::collection_item_status
    else 'pending'::collection_item_status
  end,
  updated_at = now()
where status in ('overdue', 'missed');

update credits
set status = 'active'::credit_status, updated_at = now()
where status = 'delinquent';

update clients
set status = 'active'::client_status, updated_at = now()
where status = 'delinquent';

with totals as (
  select
    collection_day_id,
    coalesce(sum(expected_amount), 0) as total_expected,
    coalesce(sum(collected_amount), 0) as total_collected,
    coalesce(sum(greatest(expected_amount - collected_amount, 0)), 0) as total_pending,
    coalesce(
      sum(
        case
          when status in ('overdue', 'missed') then greatest(expected_amount - collected_amount, 0)
          else 0
        end
      ),
      0
    ) as total_overdue
  from collection_items
  group by collection_day_id
)
update collection_days as collection_day
set
  total_expected = totals.total_expected,
  total_collected = totals.total_collected,
  total_pending = totals.total_pending,
  total_overdue = totals.total_overdue,
  updated_at = now()
from totals
where collection_day.id = totals.collection_day_id;

commit;
