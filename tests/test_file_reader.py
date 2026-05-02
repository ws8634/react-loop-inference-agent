import os
import tempfile
import pytest
from src.skills import FileReadSkill, set_allowed_directory


class TestFileReadSkill:
    @pytest.fixture
    def temp_dir(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            set_allowed_directory(tmpdir)
            yield tmpdir

    def test_read_file_success(self, temp_dir):
        test_content = "Hello, World!\n这是中文测试。"
        test_file = os.path.join(temp_dir, "test.txt")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(test_content)

        skill = FileReadSkill()
        result = skill.execute(filename="test.txt")

        assert result.success is True
        assert result.output == test_content
        assert result.error_message is None

    def test_read_file_not_found(self, temp_dir):
        skill = FileReadSkill()
        result = skill.execute(filename="nonexistent.txt")

        assert result.success is False
        assert result.output == ""
        assert "不存在" in result.error_message

    def test_path_traversal_denied_parent(self, temp_dir):
        with tempfile.TemporaryDirectory() as outer_dir:
            secret_file = os.path.join(outer_dir, "secret.txt")
            with open(secret_file, "w", encoding="utf-8") as f:
                f.write("secret content")

            skill = FileReadSkill()
            result = skill.execute(filename="../secret.txt")

            assert result.success is False
            assert "拒绝" in result.error_message

    def test_path_traversal_denied_absolute(self, temp_dir):
        skill = FileReadSkill()
        result = skill.execute(filename="/etc/passwd")

        assert result.success is False
        assert "拒绝" in result.error_message

    def test_path_traversal_denied_nested(self, temp_dir):
        skill = FileReadSkill()
        result = skill.execute(filename="subdir/../../secret.txt")

        assert result.success is False
        assert "拒绝" in result.error_message

    def test_invalid_characters_denied(self, temp_dir):
        skill = FileReadSkill()

        bad_names = [
            "test<evil>.txt",
            "test|evil.txt",
            "test\"evil.txt",
            "test*evil.txt",
            "test?evil.txt",
        ]

        for bad_name in bad_names:
            result = skill.execute(filename=bad_name)
            assert result.success is False
            assert "拒绝" in result.error_message

    def test_empty_filename(self, temp_dir):
        skill = FileReadSkill()
        result = skill.execute(filename="")

        assert result.success is False
        assert "拒绝" in result.error_message

    def test_directory_instead_of_file(self, temp_dir):
        subdir = os.path.join(temp_dir, "subdir")
        os.makedirs(subdir)

        skill = FileReadSkill()
        result = skill.execute(filename="subdir")

        assert result.success is False
        assert "不是文件" in result.error_message

    def test_valid_subdirectory_file(self, temp_dir):
        subdir = os.path.join(temp_dir, "subdir")
        os.makedirs(subdir)

        test_content = "nested file content"
        test_file = os.path.join(subdir, "nested.txt")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write(test_content)

        skill = FileReadSkill()
        result = skill.execute(filename="subdir/nested.txt")

        assert result.success is True
        assert result.output == test_content
