-- Allow admins and owners to update team members in their company
-- Fixes: toggleMemberStatus was silently failing because the only UPDATE
-- policy on users was "Users can update own profile" (id = auth.uid()).
CREATE POLICY "Admins can update team members" ON users
    FOR UPDATE USING (
        company_id IN (
            SELECT u.company_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'owner')
        )
    );
