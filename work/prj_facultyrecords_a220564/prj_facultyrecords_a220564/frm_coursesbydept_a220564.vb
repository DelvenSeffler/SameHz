Public Class frm_coursesbydept_a220564
    Private Sub frm_coursesbydept_a220564_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Dim mysql As String = "SELECT FLD_DEPT_ID FROM TBL_DEPARTMENT_A220564"
        Dim mydatatable As New DataTable
        Dim myreader As New OleDb.OleDbDataAdapter(mysql, myconnection)
        myreader.Fill(mydatatable)
        cmb_dept.DisplayMember = "FLD_DEPT_ID"
        cmb_dept.DataSource = mydatatable

        refresh_grid(cmb_dept.Text)
    End Sub

    Private Sub refresh_grid(dept_id As String)
        Dim mysql As String = "SELECT * FROM TBL_COURSES_A220564 WHERE FLD_MANAGING_DEPT='" & dept_id & "'"
        Dim mydatatable As New DataTable
        Dim myreader As New OleDb.OleDbDataAdapter(mysql, myconnection)
        myreader.Fill(mydatatable)
        grd_courses.DataSource = mydatatable

        grd_courses.Columns(0).HeaderText = "Course Code"
        grd_courses.Columns(1).HeaderText = "Course Name"
        grd_courses.Columns(2).HeaderText = "Credits"
        grd_courses.Columns(3).HeaderText = "Managing Department"
    End Sub

    Private Sub cmb_dept_SelectedIndexChanged(sender As Object, e As EventArgs) Handles cmb_dept.SelectedIndexChanged
        If cmb_dept.Text <> "" Then
            refresh_grid(cmb_dept.Text)
        End If
    End Sub

    Private Sub btn_back_Click(sender As Object, e As EventArgs) Handles btn_back.Click
        frm_mainmenu_a220564.Show()
        Me.Hide()
    End Sub
End Class
