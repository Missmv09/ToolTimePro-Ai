-- Allow admins and owners to create new team members in their company
-- This fixes the RLS error when creating team members from the dashboard

CREATE POLICY "Admins can insert team members" ON users
    FOR INSERT WITH CHECK (
        -- Allow if the inserting user is an admin or owner in the same company
        company_id IN (
            SELECT u.company_id
            FROM users u
            WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'owner')
        )
    );
