Public Class frm_studentdetails_a220564
    Private Sub frm_studentdetails_a220564_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Dim mysql As String = "SELECT FLD_MATRIC FROM TBL_STUDENTS_A220564"
        Dim mydatatable As New DataTable
        Dim myreader As New OleDb.OleDbDataAdapter(mysql, myconnection)
        myreader.Fill(mydatatable)
        lst_matric.DisplayMember = "FLD_MATRIC"
        lst_matric.DataSource = mydatatable

        refresh_text(lst_matric.Text)
    End Sub

    Private Sub refresh_text(matric As String)
        If matric = "" Then Exit Sub

        Dim mysql As String = "SELECT * FROM TBL_STUDENTS_A220564 WHERE FLD_MATRIC='" & matric & "'"
        Dim mydatatable As New DataTable
        Dim myreader As New OleDb.OleDbDataAdapter(mysql, myconnection)
        myreader.Fill(mydatatable)

        If mydatatable.Rows.Count > 0 Then
            txt_matric.Text = mydatatable.Rows(0).Item("FLD_MATRIC").ToString()
            txt_name.Text = mydatatable.Rows(0).Item("FLD_NAME").ToString()
            txt_dept.Text = mydatatable.Rows(0).Item("FLD_DEPT").ToString()

            Dim picpath As String = Application.StartupPath & "\pictures\" & matric & ".jpg"
            If IO.File.Exists(picpath) Then
                If pic_student.BackgroundImage IsNot Nothing Then
                    pic_student.BackgroundImage.Dispose()
                End If
                Using fs As New IO.FileStream(picpath, IO.FileMode.Open, IO.FileAccess.Read)
                    pic_student.BackgroundImage = New Bitmap(Image.FromStream(fs))
                End Using
            Else
                pic_student.BackgroundImage = Nothing
            End If
        End If
    End Sub

    Private Sub lst_matric_MouseClick(sender As Object, e As MouseEventArgs) Handles lst_matric.MouseClick
        refresh_text(lst_matric.Text)
    End Sub

    Private Sub btn_back_Click(sender As Object, e As EventArgs) Handles btn_back.Click
        frm_mainmenu_a220564.Show()
        Me.Hide()
    End Sub
End Class
