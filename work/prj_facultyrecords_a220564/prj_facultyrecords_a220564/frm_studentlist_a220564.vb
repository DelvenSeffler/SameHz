Public Class frm_studentlist_a220564
    Private Sub frm_studentlist_a220564_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Dim mysql As String = "SELECT * FROM TBL_STUDENTS_A220564"
        Dim mydatatable As New DataTable
        Dim myreader As New OleDb.OleDbDataAdapter(mysql, myconnection)
        myreader.Fill(mydatatable)
        grd_students.DataSource = mydatatable

        grd_students.Columns(0).HeaderText = "Matric No."
        grd_students.Columns(1).HeaderText = "Name"
        grd_students.Columns(2).HeaderText = "Department"
    End Sub

    Private Sub btn_back_Click(sender As Object, e As EventArgs) Handles btn_back.Click
        frm_mainmenu_a220564.Show()
        Me.Hide()
    End Sub
End Class
