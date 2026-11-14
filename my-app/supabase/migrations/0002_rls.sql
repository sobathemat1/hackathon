ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_organizations" ON organizations;
CREATE POLICY "allow_read_organizations" ON organizations FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_organizations" ON organizations;
CREATE POLICY "allow_write_organizations" ON organizations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_read_users" ON users;
CREATE POLICY "allow_read_users" ON users FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_users" ON users;
CREATE POLICY "allow_write_users" ON users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_read_letter_types" ON letter_types;
CREATE POLICY "allow_read_letter_types" ON letter_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_write_letter_types" ON letter_types;
CREATE POLICY "allow_write_letter_types" ON letter_types FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_counters" ON submission_counters;
CREATE POLICY "allow_all_counters" ON submission_counters FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_submissions" ON submissions;
CREATE POLICY "allow_all_submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_submission_documents" ON submission_documents;
CREATE POLICY "allow_all_submission_documents" ON submission_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_submission_histories" ON submission_histories;
CREATE POLICY "allow_all_submission_histories" ON submission_histories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_notifications" ON notifications;
CREATE POLICY "allow_all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_audit_logs" ON audit_logs;
CREATE POLICY "allow_all_audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_system_settings" ON system_settings;
CREATE POLICY "allow_all_system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
