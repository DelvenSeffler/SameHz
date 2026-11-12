Imports System
Imports System.Drawing
Imports System.Windows.Forms
Imports System.IO

Module TestModule
    <STAThread>
    Sub Main()
        Application.EnableVisualStyles()
        Dim shotdir As String = "C:\Users\sheep8898\Documents\deepseek-harness\default-workspace\screenshots"
        Directory.CreateDirectory(shotdir)

        Dim f1 As New prj_facultyrecords_a220564.frm_coursesbydept_a220564()
        f1.Show() : Pump()
        Save(f1, Path.Combine(shotdir, "01_courses_by_dept.png"))
        Dim cmb As ComboBox = CType(Find(f1, "cmb_dept"), ComboBox)
        Dim g1 As DataGridView = CType(Find(f1, "grd_courses"), DataGridView)
        Console.WriteLine("courses combo=" & cmb.Items.Count & " rows=" & g1.Rows.Count)
        f1.Close()

        Dim f2 As New prj_facultyrecords_a220564.frm_studentdetails_a220564()
        f2.Show() : Pump()
        Save(f2, Path.Combine(shotdir, "02_student_details.png"))
        f2.Close()

        Dim f3 As New prj_facultyrecords_a220564.frm_searchcourses_a220564()
        f3.Show() : Pump()
        CType(Find(f3, "txt_search"), TextBox).Text = "data"
        Application.DoEvents() : Pump()
        Save(f3, Path.Combine(shotdir, "03_search_courses.png"))
        Console.WriteLine("search rows=" & CType(Find(f3, "grd_courses"), DataGridView).Rows.Count)
        f3.Close()

        Dim f4 As New prj_facultyrecords_a220564.frm_login_a220564()
        f4.Show() : Pump()
        Save(f4, Path.Combine(shotdir, "04_login.png"))
        f4.Close()

        Dim f5 As New prj_facultyrecords_a220564.frm_mainmenu_a220564()
        f5.Show() : Pump()
        Save(f5, Path.Combine(shotdir, "05_mainmenu.png"))
        f5.Close()

        Dim f6 As New prj_facultyrecords_a220564.frm_studentlist_a220564()
        f6.Show() : Pump()
        Save(f6, Path.Combine(shotdir, "06_student_list.png"))
        f6.Close()

        Console.WriteLine("DONE")
    End Sub

    Sub Pump()
        Application.DoEvents()
        System.Threading.Thread.Sleep(350)
        Application.DoEvents()
    End Sub

    Function Find(f As Form, n As String) As Control
        Dim c() As Control = f.Controls.Find(n, True)
        If c.Length = 0 Then Return Nothing
        Return c(0)
    End Function

    Sub Save(f As Form, path As String)
        Dim bmp As New Bitmap(f.Width, f.Height)
        f.DrawToBitmap(bmp, New Rectangle(0, 0, f.Width, f.Height))
        bmp.Save(path, Imaging.ImageFormat.Png)
        bmp.Dispose()
    End Sub
End Module
