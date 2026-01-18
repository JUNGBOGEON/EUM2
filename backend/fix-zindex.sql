-- whiteboard_item 테이블의 zIndex 컬럼을 integer에서 bigint로 변경
ALTER TABLE whiteboard_item 
ALTER COLUMN "zIndex" TYPE bigint USING "zIndex"::bigint;
