Public Class frm_login_a220564
    Private Sub btn_login_Click(sender As Object, e As EventArgs) Handles btn_login.Click
        Dim mysql As String = "SELECT COUNT(*) AS NUM_MATCHES FROM TBL_USERS_A220564 WHERE FLD_USERNAME='" & txt_username.Text & "' AND FLD_PASSWORD='" & txt_password.Text & "'"
        Dim mydatatable As New DataTable
        Dim myreader As New OleDb.OleDbDataAdapter(mysql, myconnection)
        myreader.Fill(mydatatable)

        Dim num_matches As String = mydatatable.Rows(0).Item("NUM_MATCHES").ToString()

        If num_matches = 1 Then
            username = txt_username.Text
            frm_mainmenu_a220564.Show()
            Me.Hide()
        Else
            txt_username.Text = ""
            txt_password.Text = ""
            MsgBox("Incorrect Username or Password")
        End If
    End Sub
End Class
