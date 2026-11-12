Public Class frm_splashscreen_a220564
    Private Sub frm_splashscreen_a220564_Load(sender As Object, e As EventArgs) Handles MyBase.Load

        MsgBox("Welcome!")
    End Sub

    Private Sub btn_start_Click(sender As Object, e As EventArgs) Handles btn_start.Click
        username = txt_name.Text
        frm_login_a220564.Show()
        Me.Hide()
    End Sub

    Private Sub btn_exit_Click(sender As Object, e As EventArgs) Handles btn_exit.Click
        End
    End Sub
End Class
