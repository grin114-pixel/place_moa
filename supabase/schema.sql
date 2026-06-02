-- 놀러가자 앱 DB 스키마
-- Supabase SQL Editor에서 실행하세요

create table if not exists nolleogaja_categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  sort_order integer default 0,
  created_at timestamptz default now()
);

alter table nolleogaja_categories add column if not exists sort_order integer default 0;

insert into nolleogaja_categories (name)
select '미지정'
where not exists (
  select 1 from nolleogaja_categories where name = '미지정'
);

create table if not exists nolleogaja_cards (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references nolleogaja_categories(id) on delete cascade,
  title text,
  content text not null,
  link text,
  created_at timestamptz default now()
);

-- 기존 테이블에 title 컬럼 추가 (이미 테이블이 있는 경우)
alter table nolleogaja_cards add column if not exists title text;

-- RLS (Row Level Security) 활성화
alter table nolleogaja_categories enable row level security;
alter table nolleogaja_cards enable row level security;

-- 모든 사용자 읽기/쓰기 허용 (필요에 따라 수정)
create policy "Allow all on nolleogaja_categories" on nolleogaja_categories for all using (true) with check (true);
create policy "Allow all on nolleogaja_cards" on nolleogaja_cards for all using (true) with check (true);
