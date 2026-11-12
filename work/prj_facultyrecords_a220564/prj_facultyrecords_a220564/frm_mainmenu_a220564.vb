Public Class frm_mainmenu_a220564
    Private Sub frm_mainmenu_a220564_Load(sender As Object, e As EventArgs) Handles MyBase.Load
        Dim current_date As String = Date.Now
        lbl_date.Text = current_date
        lbl_welcome.Text = "Welcome " & username & " to the UKM Faculty Records System"
    End Sub

    Private Sub btn_coursesdept_Click(sender As Object, e As EventArgs) Handles btn_coursesdept.Click
        frm_coursesbydept_a220564.Show()
        Me.Hide()
    End Sub

    Private Sub btn_studentdetails_Click(sender As Object, e As EventArgs) Handles btn_studentdetails.Click
        frm_studentdetails_a220564.Show()
        Me.Hide()
    End Sub

    Private Sub btn_searchcourses_Click(sender As Object, e As EventArgs) Handles btn_searchcourses.Click
        frm_searchcourses_a220564.Show()
        Me.Hide()
    End Sub

    Private Sub btn_studentlist_Click(sender As Object, e As EventArgs) Handles btn_studentlist.Click
        frm_studentlist_a220564.Show()
        Me.Hide()
    End Sub

    Private Sub btn_logout_Click(sender As Object, e As EventArgs) Handles btn_logout.Click
        frm_login_a220564.Show()
        Me.Hide()
    End Sub

    Private Sub btn_exit_Click(sender As Object, e As EventArgs) Handles btn_exit.Click
        End
    End Sub
End Class
